import { Directive, HostBinding, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appFormFieldState]'
})
export class FormFieldStateDirective {
  private readonly control = inject(NgControl, { optional: true });

  @HostBinding('class.form-field-invalid')
  protected get isInvalid(): boolean {
    const control = this.control?.control;

    return Boolean(control?.hasError('required') && (control.touched || control.dirty));
  }

  @HostBinding('attr.aria-invalid')
  protected get ariaInvalid(): 'true' | null {
    return this.isInvalid ? 'true' : null;
  }
}
