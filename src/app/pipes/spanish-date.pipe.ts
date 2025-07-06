import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'spanishDate'
})
export class SpanishDatePipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '';
    
    const date = new Date(value);
    
    if (isNaN(date.getTime())) return 'Fecha inválida';

    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    }
  }
