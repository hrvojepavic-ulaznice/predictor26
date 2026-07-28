import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-team-name',
  templateUrl: './team-name.component.html',
  styleUrl: './team-name.component.scss'
})
export class TeamNameComponent {
  readonly name = input.required<string>();
  readonly flag = input<string | null>(null);

  protected readonly logoUrl = computed(() => {
    const flag = this.flag();

    return flag && /^(?:https:\/\/|\/)/i.test(flag) ? flag : null;
  });

  protected readonly textFlag = computed(() => {
    const flag = this.flag();

    return flag && !/^(?:https:\/\/|\/)/i.test(flag) ? flag : null;
  });
}
