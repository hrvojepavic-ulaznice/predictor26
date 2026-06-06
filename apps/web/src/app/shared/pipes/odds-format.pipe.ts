import { Pipe, PipeTransform } from '@angular/core';

import { formatOddsValue } from '@shared/utils/number-format.utils';

@Pipe({
  name: 'oddsFormat'
})
export class OddsFormatPipe implements PipeTransform {
  transform(value: number): string {
    return formatOddsValue(value);
  }
}
