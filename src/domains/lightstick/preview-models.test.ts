import { expect, it } from 'vitest';

import { previewModels } from './preview-models';

it('maps connected devices to one stick per model, SE before V4', () => {
  expect(previewModels([])).toEqual([]);
  expect(previewModels([{ deviceType: 'v4' }])).toEqual(['v4']);
  expect(
    previewModels([
      { deviceType: 'v4' },
      { deviceType: 'multi' },
      { deviceType: 'v3' },
    ]),
  ).toEqual(['se', 'v4']);
  expect(previewModels([{ deviceType: 'se' }, { deviceType: 'se' }])).toEqual([
    'se',
  ]);
});
