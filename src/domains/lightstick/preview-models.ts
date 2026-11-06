export type StickModel = 'se' | 'v4';

export function previewModels(devices: { deviceType: string }[]): StickModel[] {
  const models = new Set(
    devices.map((d): StickModel => (d.deviceType === 'v4' ? 'v4' : 'se')),
  );
  return (['se', 'v4'] as const).filter((m) => models.has(m));
}
