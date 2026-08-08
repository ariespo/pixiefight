"""Split each fixed monster sprite into four lossless, semantic PNG layers.

The source art is authored on a 32x32 logical pixel grid and stored at 8x.
Every logical cell is assigned to exactly one category, so overlaying the four
outputs reconstructs the source PNG byte-for-byte at the pixel level.
"""
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
CATS = ("core", "head", "arm", "legs")

# head/legs cuts plus explicit arm rectangles on the 32x32 logical grid.
# Rectangles are inclusive: x1, y1, x2, y2.
RULES = {
    "slime":       (18, 25, [(4, 18, 9, 27), (23, 18, 27, 27)]),
    "goblin":      (18, 25, [(5, 18, 13, 24), (21, 18, 25, 24)]),
    "archer":      (15, 25, [(6, 13, 12, 27), (22, 15, 25, 24)]),
    "bat":         (19, 26, [(4, 14, 11, 25), (21, 14, 27, 25)]),
    "shaman":      (16, 25, [(5, 7, 11, 28), (22, 14, 26, 24)]),
    "ogre":        (12, 25, [(3, 11, 9, 23), (22, 4, 28, 23)]),
    "hundredarm":  (15, 27, [(1, 9, 9, 25), (23, 9, 30, 25)]),
    "lich":        (13, 27, [(5, 2, 10, 30), (18, 12, 25, 25)]),
    "mindflayer":  (14, 25, [(4, 8, 11, 20), (23, 14, 27, 24)]),
    "plaguelord":  (11, 27, [(2, 9, 11, 22), (24, 12, 29, 26)]),
    "magmagolem":  (11, 26, [(0, 10, 8, 25), (24, 9, 31, 25)]),
}


def in_rect(x, y, rects):
    return any(x1 <= x <= x2 and y1 <= y <= y2 for x1, y1, x2, y2 in rects)


def category(monster, x, y):
    if monster == "bonedragon":
        if x <= 11 and y <= 22:
            return "head"
        if y >= 26:
            return "legs"
        if (x >= 12 and y <= 17) or (10 <= x <= 16 and 18 <= y <= 25):
            return "arm"
        return "core"
    if monster == "beholder":
        if y >= 24:
            return "legs"
        if x < 9 or x > 23 or y < 10:
            return "arm"
        if 9 <= x <= 23 and 10 <= y <= 21:
            return "head"
        return "core"
    if monster == "broodqueen":
        if y >= 18:
            return "legs"
        if x <= 12:
            return "head"
        if x >= 25 or y <= 8:
            return "arm"
        return "core"
    head_y, legs_y, arms = RULES[monster]
    if in_rect(x, y, arms):
        return "arm"
    if y < head_y:
        return "head"
    if y >= legs_y:
        return "legs"
    return "core"


def split_one(source):
    monster = source.stem.removeprefix("mon-")
    src = Image.open(source).convert("RGBA")
    if src.width != src.height or src.width % 8:
        raise ValueError(f"{source.name}: expected a square 8x pixel-art PNG, got {src.size}")
    logical = src.width // 8
    layers = {cat: Image.new("RGBA", src.size) for cat in CATS}
    for ly in range(logical):
        for lx in range(logical):
            # Rules are authored in a common 32x32 semantic space; larger boss
            # sprites are normalized only for classification, never resampled.
            nx = min(31, int(lx * 32 / logical))
            ny = min(31, int(ly * 32 / logical))
            cat = category(monster, nx, ny)
            tile = src.crop((lx * 8, ly * 8, (lx + 1) * 8, (ly + 1) * 8))
            layers[cat].paste(tile, (lx * 8, ly * 8))
    for cat, layer in layers.items():
        layer.save(ASSETS / f"part-native-{monster}-{cat}.png", optimize=True)

    rebuilt = Image.new("RGBA", src.size)
    for layer in layers.values():
        rebuilt.alpha_composite(layer)
    diff = ImageChops.difference(src, rebuilt)
    if diff.getbbox() is not None:
        raise AssertionError(f"{monster}: four layers do not reconstruct source")
    return monster, sum(1 for layer in layers.values() if layer.getbbox())


def main():
    results = [split_one(p) for p in sorted(ASSETS.glob("mon-*.png"))]
    print(f"built {len(results) * 4} native part assets for {len(results)} monsters")
    for monster, populated in results:
        print(f"  {monster}: {populated}/4 populated, exact reconstruction OK")


if __name__ == "__main__":
    main()
