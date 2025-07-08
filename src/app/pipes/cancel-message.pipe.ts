import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cancelMessage'
})
export class CancelMessagePipe implements PipeTransform {
  transform(requestMessage: any): string {
    if (requestMessage == null) return 'Sin motivo especificado';

    // parece JSON
    if (typeof requestMessage === 'string' && requestMessage.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(requestMessage);
        return parsed.comment || requestMessage;
      } catch {
        return requestMessage;
      }
    }

    if (typeof requestMessage === 'object') {
      return requestMessage.comment || JSON.stringify(requestMessage);
    }

    return String(requestMessage);
  }
}

