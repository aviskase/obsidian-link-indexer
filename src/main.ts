import deepmerge from 'deepmerge';
import picomatch from 'picomatch';
import { Plugin, PluginSettingTab, Setting, Vault, normalizePath, TFile, getLinkpath, ReferenceCache, Notice } from 'obsidian';

interface IndexNode {
  count: number;
  link: string;
}

export default class LinkIndexer extends Plugin {
  settings: LinkIndexerSettings;
  vault: Vault;
  globalExcludes: string[]

  onInit() {}

  async onload() {
    const loadedSettings = await this.loadData();
    if (loadedSettings) {
      this.settings = deepmerge(new LinkIndexerSettings(), loadedSettings);
      this.settings.usedLinks = [];
      loadedSettings.usedLinks?.forEach((r: UsedLinks) => {
        this.settings.usedLinks.push(deepmerge(new UsedLinks(), r))
      });
    } else {
      this.settings = new LinkIndexerSettings();
    }
    this.reloadSettings();

    this.addSettingTab(new LinkIndexerSettingTab(this.app, this));
  
  }

  async onunload() {
    await this.saveData(this.settings);
  }

  reloadSettings() {
    this.removeOwnCommands();
    this.globalExcludes = [];
    this.settings.usedLinks.forEach((r: UsedLinks) => {
      this.globalExcludes.push(r.path);
      this.addCommand({
        id: `link-indexer:used-links:${r.name}`,
        name: `Used links - ${r.name}`,
        callback: async () => await this.generateAllUsedLinksIndex(getPresetByName(this.settings.usedLinks, r.name)),
      });
    });
  }

  removeOwnCommands() {
    // @ts-ignore
    this.app.commands.listCommands().map((c) => c.id).filter((c) => c.startsWith(this.manifest.id)).forEach((c: string) => {
      // @ts-ignore
      this.app.commands.removeCommand(c);
    });
  }

  async generateAllUsedLinksIndex(preset: UsedLinks) {
    if (!preset) {
      return new Notice(`${preset} was not found. Try reloading Obsidian.`);
    }
    const uniqueLinks: Record<string, IndexNode> = {};

    const files = this.app.vault.getMarkdownFiles();
    files.forEach((f) => {
      if (this.isExcluded(f, preset.excludeFromFilenames, preset.excludeFromGlobs)) return;
      this.grabLinks(uniqueLinks, f, this.app.metadataCache.getFileCache(f).links, preset)
      if (preset.includeEmbeds) {
        this.grabLinks(uniqueLinks, f, this.app.metadataCache.getFileCache(f).embeds, preset)
      }
    });
    const sortedLinks = Object.entries(uniqueLinks).sort((a, b) => b[1].count - a[1].count);
    const separator = preset.strictLineBreaks ? '\n\n' : '\n';
    const content = sortedLinks.map((l) => `${l[1].count} ${l[1].link}`).join(separator);
    const exist = await this.app.vault.adapter.exists(normalizePath(preset.path), false);
    if (exist) {
      const p = this.app.vault.getAbstractFileByPath(normalizePath(preset.path));
      this.app.vault.adapter.write(normalizePath(preset.path), content);
    } else {
      this.app.vault.create(preset.path, content);
    }
  }

  isExcluded(f: TFile, filenamePatterns: string[], globPatterns:  string[]) {
    const isGloballyExcluded = this.globalExcludes.some((g) => pathEqual(g, f.path));
    const isFilenameExcluded = filenamePatterns.some((p) => new RegExp(p).test(f.name));
    const isGlobExcluded = picomatch.isMatch(f.path, globPatterns);
    return isGloballyExcluded || isFilenameExcluded || isGlobExcluded;
  }

  grabLinks(uniqueLinks: Record<string, IndexNode>, f: TFile, links: ReferenceCache[], preset: UsedLinks) {
    links?.forEach((l) => {
      const link = getLinkpath(l.link);
      const originFile = this.app.metadataCache.getFirstLinkpathDest(link, f.path);
      if (originFile && (preset.nonexistentOnly || this.isExcluded(originFile, preset.excludeToFilenames, preset.excludeToGlobs))) {
        return;
      }
      const origin = originFile ? originFile.path : link;
      if (uniqueLinks[origin]) {
        uniqueLinks[origin].count += 1;
      } else {
        const rawLink = originFile ? this.app.metadataCache.fileToLinktext(originFile, preset.path, true) : link;
        uniqueLinks[origin] = {
          count: 1,
          link: preset.linkToFiles ? `[[${rawLink}]]` : rawLink
        };
      }
    });
  }
}

class UsedLinks {
  name: string;
  path: string;
  strictLineBreaks = true;
  includeEmbeds = true;
  linkToFiles = true;
  nonexistentOnly = false;
  excludeToFilenames: string[] = [];
  excludeToGlobs: string[] = [];
  excludeFromFilenames: string[] = [];
  excludeFromGlobs: string[] = [];

  constructor() {
    this.name = Date.now().toString();
    this.path = `./used_links${this.name}.md`;
  }
}

class LinkIndexerSettings {
  usedLinks: UsedLinks[] = [];
}

type Preset = UsedLinks;

function getPresetByName(presets: Preset[], name: string): Preset {
  return presets.find((r) => r.name === name);
}

class LinkIndexerSettingTab extends PluginSettingTab {
  display(): void {
    let { containerEl } = this;
    const plugin: LinkIndexer = (this as any).plugin;

    containerEl.empty();

    containerEl.createEl('h2', {text: 'Used links'});

    plugin.settings.usedLinks.forEach((report) => {
      new Setting(containerEl)
        .setName('Preset name')
        .setDesc('Allowed characters: ASCII letters, digits, underscores, spaces')
        .addText((text) => 
          text.setPlaceholder(report.name)
            .setPlaceholder(report.name)
            .setValue(report.name)
            .onChange(async (value: string) => {
              report.name = value;
              await this.saveData({ refreshUI: false });
            })
        );
      new Setting(containerEl)
        .setName('All used links')
        .setDesc('Path to the note that will contain all found links sorted by their occurrences')
        .addText((text) => 
          text
            .setPlaceholder(report.path)
            .setValue(report.path)
            .onChange(async (value) => {
              report.path = value;
              await this.saveData({ refreshUI: false });
            })
        );
      
      new Setting(containerEl)
        .setName('Include embeds')
        .setDesc('When disabled, only direct links are counted. Enable to include embedded (trascluded) links.')
        .addToggle((value) => 
          value
            .setValue(report.includeEmbeds)
            .onChange(async (value) => {
              report.includeEmbeds = value;
              await this.saveData({ refreshUI: false });
            })
        );
      
      new Setting(containerEl)
        .setName('Nonexistent files only')
        .setDesc('When disabled, links to both existing and nonexisting files are counted.')
        .addToggle((value) => 
          value
            .setValue(report.nonexistentOnly)
            .onChange(async (value) => {
              report.nonexistentOnly = value;
              await this.saveData({ refreshUI: false });
            })
        );


      new Setting(containerEl)
        .setName('Strict line breaks')
        .setDesc('Corresponds to the same Editor setting: "off" = one line break, "on" = two line breaks.')
        .addToggle((value) => 
          value
            .setValue(report.strictLineBreaks)
            .onChange(async (value) => {
              report.strictLineBreaks = value;
              await this.saveData({ refreshUI: false });
            })
        );
      
      new Setting(containerEl)
        .setName('Link to files')
        .setDesc('When "on" the output file will use wiki-links to files. Disable if you don\'t want to pollute graph with it.')
        .addToggle((value) => 
          value
            .setValue(report.linkToFiles)
            .onChange(async (value) => {
              report.linkToFiles = value;
              await this.saveData({ refreshUI: false });
            })
        );
      
      new Setting(containerEl)
        .setName('Exclude links from files')
        .setDesc('Expects regex patterns. Checks for filename without path.')
        .addTextArea((text) => 
          text
            .setValue(report.excludeFromFilenames.join('\n'))
            .onChange(async (value) => {
              report.excludeFromFilenames = value.split('\n').filter((v) => v);
              await this.saveData({ refreshUI: false });
            })
        );
      
      new Setting(containerEl)
        .setName('Exclude links from paths')
        .setDesc('Expects path globs. Checks for file path including filename.')
        .addTextArea((text) => 
          text
            .setValue(report.excludeFromGlobs.join('\n'))
            .onChange(async (value) => {
              report.excludeFromGlobs = value.split('\n').filter((v) => v);
              await this.saveData({ refreshUI: false });
            })
        );
      
      new Setting(containerEl)
        .setName('Exclude links to files')
        .setDesc('Expects regex patterns. Checks for filename without path.')
        .addTextArea((text) => 
          text
            .setValue(report.excludeToFilenames.join('\n'))
            .onChange(async (value) => {
              report.excludeToFilenames = value.split('\n').filter((v) => v);
              await this.saveData({ refreshUI: false });
            })
        );
      
      new Setting(containerEl)
        .setName('Exclude links to paths')
        .setDesc('Expects path globs. Checks for file path including filename.')
        .addTextArea((text) => 
          text
            .setValue(report.excludeToGlobs.join('\n'))
            .onChange(async (value) => {
              report.excludeToGlobs = value.split('\n').filter((v) => v);
              await this.saveData({ refreshUI: false });
            })
        );
      
      const deleteButton = new Setting(containerEl).addButton((extra) => {
        return extra.setButtonText('Delete preset').onClick(async() => {
          const index = plugin.settings.usedLinks.findIndex((r) => r.name === report.name);
          if (index > -1) {
            plugin.settings.usedLinks.splice(index, 1);
            await this.saveData();
          }
        });
      });
      deleteButton.settingEl.style.borderBottom = '1px solid var(--text-accent)';
    });

    const addButton = new Setting(containerEl).addButton((button) => {
      return button.setButtonText('Add preset').onClick(async () => {
        plugin.settings.usedLinks.push(new UsedLinks());
        await this.saveData();
      });
    });

    addButton.infoEl.remove();
    addButton.settingEl.style.justifyContent = 'center';
  }

  async saveData(options = { refreshUI: true }) {
    const plugin: LinkIndexer = (this as any).plugin;
    await plugin.saveData(plugin.settings);
    plugin.reloadSettings();
    if (options.refreshUI) this.display();
  }
}


function pathEqual(a: string, b: string) {
  if (a === b) return true

  return removeDots(normalizePath(a)) === removeDots(normalizePath(b))
}

function removeDots(value: string) {
  return value.replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/\.\//, '/')
}
