export const hexToRgb = (color: string) => {
  const colorString = color.replace(/#/g, '');

  const [r, g, b] = (colorString.length <= 3 ? colorString.split('').map((hex) => hex + hex).join('') : colorString).match(/.{1,2}/g);

  return {
    r: parseInt(r, 16),
    g: parseInt(g, 16),
    b: parseInt(b, 16),
  };
};

export const rgbToHex = (r: number, g: number, b: number) => {
  const colorsArray = [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  });

  return `#${colorsArray.join('')}`;
};
