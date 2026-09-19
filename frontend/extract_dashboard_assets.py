import os
from PIL import Image

mockup_path = r'C:\Users\kanheya\.gemini\antigravity-ide\brain\0914c123-2cec-40ec-9933-fee0b393e073\.user_uploaded\media_1789794676256.jpg'
out_dir = r'd:\codeniti new\frontend\public\dashboard'
os.makedirs(out_dir, exist_ok=True)

im = Image.open(mockup_path)
w, h = im.size

# 1. Tiger on the cliff from hero-tiger:
hero = Image.open(r'd:\codeniti new\frontend\public\hero-tiger.jpg')
# hero is 1376 x 768
# Tiger is located around x=900..1320, y=190..600
tiger_crop = hero.crop((920, 190, 1310, 580))
tiger_crop.save(os.path.join(out_dir, 'tiger_hero_crop.png'))

# 2. Forest landscape top background (without cards):
# From hero-tiger, take the top panorama:
bg_panorama = hero.crop((0, 0, 1376, 400))
bg_panorama.save(os.path.join(out_dir, 'forest_banner_bg.jpg'), quality=90)

# 3. Fire hotspot thumbnail from mockup:
fire_crop = im.crop((int(w * 0.445), int(h * 0.505), int(w * 0.495), int(h * 0.585)))
fire_crop.save(os.path.join(out_dir, 'fire_callout_clean.png'))

# 4. Sidebar botanical from mockup:
sidebar_botanical = im.crop((0, int(h * 0.74), int(w * 0.165), h))
sidebar_botanical.save(os.path.join(out_dir, 'sidebar_botanical_clean.png'))

# 5. Quote botanical from mockup:
quote_botanical = im.crop((int(w * 0.755), int(h * 0.90), int(w * 0.985), int(h * 0.985)))
quote_botanical.save(os.path.join(out_dir, 'quote_botanical_clean.png'))

# 6. Avatar:
avatar_crop = im.crop((int(w * 0.844), int(h * 0.012), int(w * 0.865), int(h * 0.045)))
avatar_crop.save(os.path.join(out_dir, 'kanhaiya_avatar_clean.png'))

print("Updated extracted assets successfully!")
