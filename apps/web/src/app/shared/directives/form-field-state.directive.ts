import { Directive, HostBinding, input, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

type FormFieldInvalidMode = 'required' | 'invalid';

@Directive({
  selector: '[appFormFieldState]'
})
export class FormFieldStateDirective {
  readonly invalidMode = input<FormFieldInvalidMode>('required', {
    alias: 'appFormFieldState'
  });

  private readonly control = inject(NgControl, { optional: true });

  @HostBinding('class.form-field-invalid')
  protected get isInvalid(): boolean {
    const control = this.control?.control;

    if (!control || (!control.touched && !control.dirty)) {
      return false;
    }

    return this.invalidMode() === 'invalid' ? control.invalid : control.hasError('required');
  }

  @HostBinding('attr.aria-invalid')
  protected get ariaInvalid(): 'true' | null {
    return this.isInvalid ? 'true' : null;
  }
}
