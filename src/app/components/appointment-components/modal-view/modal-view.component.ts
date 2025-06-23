import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-view',
  imports: [],
  templateUrl: './modal-view.component.html',
  styleUrl: './modal-view.component.css'
})
export class ModalViewComponent {
  @Input() title: string = 'Detalle';
  @Input() content: string = '';
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
