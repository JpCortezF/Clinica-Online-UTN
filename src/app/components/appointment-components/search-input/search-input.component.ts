import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  imports: [FormsModule],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.css'
})
export class SearchInputComponent {
  @Input() placeholder = 'Buscar...';
  @Output() search = new EventEmitter<string>();

  searchTerm = '';

  onInputChange() {
    this.search.emit(this.searchTerm);
  }
}
