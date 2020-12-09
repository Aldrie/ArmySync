export interface IEffect {
  from?: number;
  to?: number;
  exec?: (ms?: number) => string;
}

export type IScheme = IEffect[];

export const changeEffect = (color: string) => () => color;

export const TestScheme: IScheme = [
  {
    from: 0,
    to: 7500,
    exec: changeEffect('#FFF'),
  },
  {
    from: 7800,
    to: 13000,
    exec: changeEffect('#000'),
  },
  {
    from: 13000,
    to: 21600,
    exec: changeEffect('#8bb3f7'),
  },
  {
    from: 21600,
    to: 22000,
    exec: changeEffect('#ccc'),
  },
  {
    from: 22000,
    to: 30350,
    exec: changeEffect('#8bb3f7'),
  },
  {
    from: 30350,
    to: 31000,
    exec: changeEffect('#3ab586'),
  },
  {
    from: 31000,
    to: 37000,
    exec: changeEffect('#8bb3f7'),
  },
  {
    from: 37600,
    to: 41000,
    exec: changeEffect('#FFF'),
  },
  {
    from: 42500,
    to: 43500,
    exec: changeEffect('#803ab5'),
  },
  {
    from: 43800,
    to: 44500,
    exec: changeEffect('#000'),
  },
  {
    from: 44200,
    to: 46600,
    exec: changeEffect('#ddd'),
  },
  {
    from: 46600,
    to: 49000,
    exec: changeEffect('#fff'),
  },
  {
    from: 49500,
    to: 50100,
    exec: changeEffect('#157d76'),
  },
  {
    from: 50100,
    to: 52600,
    exec: changeEffect('#fff'),
  },
  {
    from: 53600,
    to: 54000,
    exec: changeEffect('#de3e3e'),
  },
  {
    from: 54000,
    to: 58000,
    exec: changeEffect('#157d76'),
  },
  {
    from: 58600,
    to: 60600,
    exec: changeEffect('#fafafa'),
  },
  {
    from: 67200,
    to: 68600,
    exec: changeEffect('#dea350'),
  },
  {
    from: 68600,
    to: 200000,
    exec: changeEffect('#fafafa'),
  },
];

export const sync = (time: number, onChange: (color: string) => any) => {
  const ms = Math.floor(time * 1000);
  const effect = TestScheme.find((current) => {
    if (ms >= current.from && ms <= current.to) {
      return true;
    }
    return false;
  });

  if (effect) {
    onChange(effect.exec(ms));
  }
};
