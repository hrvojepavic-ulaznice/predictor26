import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PREDICTOR_RULES } from './rules.constants';

@Component({
  selector: 'app-rules-page',
  imports: [RouterLink],
  templateUrl: './rules-page.component.html',
  styleUrl: './rules-page.component.scss'
})
export class RulesPageComponent {
  protected readonly rules = PREDICTOR_RULES;
}
