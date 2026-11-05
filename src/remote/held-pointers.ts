export function heldPointers(
  press: (padId: string) => void,
  release: (padId: string) => void,
) {
  const pads = new Map<number, string>();

  return {
    down(pointerId: number, padId: string): boolean {
      if ([...pads.values()].includes(padId)) return false;
      pads.set(pointerId, padId);
      press(padId);
      return true;
    },
    up(pointerId: number) {
      const padId = pads.get(pointerId);
      if (padId === undefined) return;
      pads.delete(pointerId);
      release(padId);
    },
    releaseAll() {
      const padIds = [...pads.values()];
      pads.clear();
      padIds.forEach((padId) => release(padId));
    },
  };
}
