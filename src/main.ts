import { Plugin, PluginSettingTab, Setting, Vault, normalizePath, TFile } from 'obsidian';

interface IndexNode {
  count: number;
  link: string;
}

export default class LinkIndexer extends Plugin {
  settings: LinkIndexerSettings;
  vault: Vault;

  onInit() {}

  async onload() {
    this.settings = (await this.loadData()) || new LinkIndexerSettings();
    this.addSettingTab(new LinkIndexerSettingTab(this.app, this));

    this.addCommand({
      id: 'link-indexer:all-used-links',
      name: 'All used links',
      callback: async () => await this.generateAllUsedLinksIndex()
    });
  
  }

  async onunload() {
    await this.saveData(this.settings);
  }

  async generateAllUsedLinksIndex() {
    const uniqueLinks: Record<string, IndexNode> = {};
    const files = this.app.vault.getMarkdownFiles();
    files.forEach((f) => {
      const links = this.app.metadataCache.getFileCache(f).links;
      links?.forEach((l) => {
        const originFile = this.app.metadataCache.getFirstLinkpathDest(l.link, f.path);
        const origin = originFile ? originFile.path : l.link;
        if (uniqueLinks[origin]) {
          uniqueLinks[origin].count += 1;
        } else {
          uniqueLinks[origin] = {
            count: 1,
            link: this.linkToFile(originFile, l.link)
          };
        }
      });
    });
    const sortedLinks = Object.entries(uniqueLinks).sort((a, b) => b[1].count - a[1].count);
    const separator = this.settings.strictLineBreaks ? '\n\n' : '\n';
    const content = sortedLinks.map((l) => `${l[1].count} ${l[1].link}`).join(separator);
    const exist = await this.app.vault.adapter.exists(normalizePath(this.settings.allUsedLinksPath), false);
    if (exist) {
      const p = this.app.vault.getAbstractFileByPath(normalizePath(this.settings.allUsedLinksPath));
      this.app.vault.adapter.write(normalizePath(this.settings.allUsedLinksPath), content);
    } else {
      this.app.vault.create(this.settings.allUsedLinksPath, content);
    }
  }

  linkToFile(originFile: TFile, fallback: string) {
    const rawLink = originFile ? this.app.metadataCache.fileToLinktext(originFile, this.settings.allUsedLinksPath, true) : fallback;
    return this.settings.linkToFiles ? `[[${rawLink}]]` : rawLink;
  }
}

class LinkIndexerSettings {
  allUsedLinksPath = './all_used_links.md';
  strictLineBreaks = true;
  linkToFiles = true;
}

class LinkIndexerSettingTab extends PluginSettingTab {
  display(): void {
    let { containerEl } = this;
    const plugin: LinkIndexer = (this as any).plugin;

    containerEl.empty();

    containerEl.createEl('h2', {text: 'Link indexer settings'});

    new Setting(containerEl)
      .setName('All used links')
      .setDesc('Path to the note that will contain all found links sorted by their occurrences')
      .addText((text) => 
        text
          .setPlaceholder(plugin.settings.allUsedLinksPath)
          .setValue(plugin.settings.allUsedLinksPath)
          .onChange(async (value) => {
            plugin.settings.allUsedLinksPath = value;
            await plugin.saveData(plugin.settings);
          })
      );
    
    new Setting(containerEl)
      .setName('Strict line breaks')
      .setDesc('Corresponds to the same Editor setting: "off" = one line break, "on" = two line breaks.')
      .addToggle((value) => 
        value
          .setValue(plugin.settings.strictLineBreaks)
          .onChange(async (value) => {
            plugin.settings.strictLineBreaks = value;
            await plugin.saveData(plugin.settings);
          })
      );
    
    new Setting(containerEl)
      .setName('Link to files')
      .setDesc('When "on" the output file will use wiki-links to files. Disable if you don\'t want to pollute graph with it.')
      .addToggle((value) => 
        value
          .setValue(plugin.settings.linkToFiles)
          .onChange(async (value) => {
            plugin.settings.linkToFiles = value;
            await plugin.saveData(plugin.settings);
          })
      );
  }
}