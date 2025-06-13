export class pageImages {
  id: number;
  description: string;
  url_img: string;

  constructor(data: Partial<pageImages> = {}) {
    this.id = data.id || 0;
    this.description = data.description || '';
    this.url_img = data.url_img || '';
  }
}
