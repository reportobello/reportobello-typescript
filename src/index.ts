export class Template {
  name: string;
  version: number;
  template: string;
}

interface IConfig {
  apiKey: string;
  host?: URL | string;
  version?: string;
}

// TODO: dont use "report.pdf" as a default
export function download(url: URL | string, downloadAs: string="report.pdf") {
  openInNewTab(url, downloadAs, true);
}

export function openInNewTab(url: URL | string, downloadAs?: string, download: boolean=false) {
  url = addDownloadOptionsToUrl(new URL(url), downloadAs, download)

  window.open(url);
}

export function openInIframe(url: URL | string, ref: string, downloadAs?: string) {
  url = addDownloadOptionsToUrl(new URL(url), downloadAs)

  url.hash = "#zoom=47&toolbar=0&navpanes=0&view=FitH";

  document.querySelector(ref).setAttribute("src", url.toString());
}

export function addDownloadOptionsToUrl(url: URL, name?: string, download: boolean=false) {
  const params = new URLSearchParams();

  if (name !== undefined) {
    params.append("downloadAs", name);
  }
  if (download) {
    params.append("download", "true")
  }

  url.search = params.toString();

  return url;
}

export class Reportobello {
  private apiKey: string;
  private host: URL;
  private version: string;

  constructor(config: IConfig) {
    this.apiKey = config.apiKey;
    this.host = new URL(config.host ?? "https://reportobello.com");
    this.version = config.version ?? "v1";
  }

  async updateEnvVars(envVars: [string: string]): Promise<void> {
    const resp = await fetch(
      `${this.host}api/${this.version}/env`,
      {
        method: "POST",
        body: JSON.stringify(envVars),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!resp.ok) {
      throw new Error(await resp.text());
    }
  }

  async deleteEnvVars(keys: string[]): Promise<void> {
    const resp = await fetch(
      `${this.host}api/${this.version}/env`,
      {
        method: "DELETE",
        body: JSON.stringify(keys),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!resp.ok) {
      throw new Error(await resp.text());
    }
  }

  async createOrUpdateTemplate(name: string, template: string): Promise<Template> {
    const resp = await fetch(
      `${this.host}api/${this.version}/template/${name}/build`,
      {
        method: "POST",
        body: template,
        headers: {
          "Content-Type": "application/x-typst",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!resp.ok) {
      throw new Error(await resp.text());
    }

    return JSON.parse(await resp.json());
  }

  async runReport<T>(name: string, data: T): Promise<URL> {
    const resp = await fetch(
      `${this.host}api/${this.version}/template/${name}/build?justUrl`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    const txt = await resp.text();

    if (!resp.ok) {
      throw new Error(txt);
    }

    return new URL(txt);
  }
}
