export const contrastColor = (color: string) => {
    const rgb = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)?.slice(1)
    if (!rgb) {
        return '#000000'
    }

    const [r, g, b] = rgb.map(c => parseInt(c, 16))
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? '#000000' : '#FFFFFF'
}