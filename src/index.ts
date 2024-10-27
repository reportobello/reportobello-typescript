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

interface IRunReportOptions {
  preview?: Boolean;
  rawTemplate?: string;
}

// TODO: dont use "report.pdf" as a default
export function download(url: URL | string, downloadAs: string="report.pdf") {
  openInNewTab(url, downloadAs, true);
}

export function openInNewTab(url: URL | string, downloadAs?: string, download: boolean=false) {
  url = addDownloadOptionsToUrl(new URL(url), downloadAs, download)

  window.open(url);
}

// TODO: allow ref to be an HTMLElement object
export function openInIframe(url: URL | string, ref: HTMLIFrameElement | string, downloadAs?: string) {
  url = addDownloadOptionsToUrl(new URL(url), downloadAs)

  url.hash = "#zoom=47&toolbar=0&navpanes=0&view=FitH";

  const element = typeof ref === "string" ? document.querySelector(ref) : ref;

  element.setAttribute("src", url.toString());
}

function addDownloadOptionsToUrl(url: URL, name?: string, download: boolean=false) {
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

export class Report {
  filename: URL;
  startedAt: Date;
  finishedAt: Date;
  errorMessage: string | null;
  templateName: string;
  requestedVersion: number;
  actualVersion: number;
  data: string;
  dataType: string;
}

export class ReportobelloError extends Error {
  public status: number;

  constructor(error: string, status: number) {
    super(error);
    this.status = status;
  }
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
      throw new ReportobelloError(await resp.text(), resp.status);
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
      throw new ReportobelloError(await resp.text(), resp.status);
    }
  }

  async createOrUpdateTemplate(name: string, template: string): Promise<Template> {
    const resp = await fetch(
      `${this.host}api/${this.version}/template/${name}`,
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
      throw new ReportobelloError(await resp.text(), resp.status);
    }

    return await resp.json();
  }

  async deleteTemplate(name: string): Promise<void> {
    const resp = await fetch(
      `${this.host}api/${this.version}/template/${name}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!resp.ok) {
      throw new ReportobelloError(await resp.text(), resp.status);
    }
  }

  async getTemplateVersions(name: string): Promise<Template[]> {
    const resp = await fetch(
      `${this.host}api/${this.version}/template/${name}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!resp.ok) {
      throw new ReportobelloError(await resp.text(), resp.status);
    }

    return await resp.json();
  }

  async runReport<T>(name: string, data: T, options: IRunReportOptions = {}): Promise<URL> {
    const resp = await fetch(
      `${this.host}api/${this.version}/template/${name}/build?justUrl${options.preview === true ? '&preview' : ''}`,
      {
        method: "POST",
        body: JSON.stringify({
          data,
          content_type: "application/json",
          template_raw: options.rawTemplate,
        }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    const txt = await resp.text();

    if (!resp.ok) {
      throw new ReportobelloError(txt, resp.status);
    }

    return new URL(txt);
  }

  async runReportAsBlob<T>(name: string, data: T, options: IRunReportOptions = {}): Promise<Blob> {
    const resp = await fetch(
      `${this.host}api/${this.version}/template/${name}/build${options.preview === true ? '?preview' : ''}`,
      {
        method: "POST",
        body: JSON.stringify({
          data,
          content_type: "application/json",
          template_raw: options.rawTemplate,
        }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!resp.ok) {
      throw new ReportobelloError(await resp.text(), resp.status);
    }

    return await resp.blob();
  }

  async getRecentReports(name: string): Promise<Report[]> {
    const resp = await fetch(
      `${this.host}api/${this.version}/template/${name}/recent`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!resp.ok) {
      throw new ReportobelloError(await resp.text(), resp.status);
    }

    const data: any[] = await resp.json();

    return data.map(x => {
      // TODO: clean this up
      x.filename = x.filename ? new URL(`${this.host}api/v1/files/${x.filename}`) : null;
      x.startedAt = new Date(x.started_at);
      x.finishedAt = new Date(x.finished_at);
      x.errorMessage = x.error_message;
      x.templateName = x.template_name;
      x.requestedVersion = x.requested_version;
      x.actualVersion = x.actualVersion;
      x.dataType = x.data_type;

      delete x.started_at;
      delete x.finished_at;
      delete x.error_message;
      delete x.template_name;
      delete x.requested_version;
      delete x.actualVersion;
      delete x.data_type;

      return x;
    });
  }
}
