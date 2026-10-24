# 生成 PWA 图标：渐变圆角方块 + 白色"研"字
# 用法：python tools/make_icons.py  （需 Pillow）
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 512
C1 = (79, 110, 247)    # #4f6ef7
C2 = (157, 92, 240)    # #9d5cf0
RADIUS = 110           # 圆角半径（约 21%）

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(OUT, exist_ok=True)


def gradient(size):
    """对角线渐变底图（RGB）"""
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(C1, C2))
    return img


def font_path():
    for p in (r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc',
              r'C:\Windows\Fonts\simhei.ttf', r'C:\Windows\Fonts\simsun.ttc'):
        if os.path.exists(p):
            return p
    raise RuntimeError('找不到中文字体')


def make(rounded=True, scale=0.46, filename='icon.png'):
    base = gradient(SIZE).convert('RGBA')
    d = ImageDraw.Draw(base)
    font = ImageFont.truetype(font_path(), int(SIZE * scale))
    d.text((SIZE / 2, SIZE / 2 + SIZE * 0.01), '研', font=font,
           fill=(255, 255, 255), anchor='mm')
    if rounded:
        mask = Image.new('L', (SIZE, SIZE), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1],
                                               radius=RADIUS, fill=255)
        base.putalpha(mask)
    for s in (512, 192):
        base.resize((s, s), Image.LANCZOS).save(
            os.path.join(OUT, filename.replace('.png', '') + f'-{s}.png'))
    print('ok:', filename)


# 常规图标（圆角、透明角）
make(rounded=True, scale=0.46, filename='icon')
# maskable 图标（满幅方形，内容缩到 80% 安全区内）
make(rounded=False, scale=0.36, filename='icon-maskable')
print('done ->', os.path.abspath(OUT))
