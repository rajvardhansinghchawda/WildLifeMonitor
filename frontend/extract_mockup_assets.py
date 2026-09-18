import os
from PIL import Image, ImageFilter
import numpy as np

mockup_path = r'C:\Users\kanheya\.gemini\antigravity-ide\brain\6272d111-76c6-4df5-87f5-e83630cad55b\.user_uploaded\media_1789763929435.jpg'
out_dir = r'd:\codeniti new\frontend\public\features'
os.makedirs(out_dir, exist_ok=True)

im = Image.open(mockup_path).convert('RGBA')
w, h = im.size
print(f'Source image size: {w}x{h}')

# 1. Pure Eagle extraction with transparent background
eagle_crop = im.crop((825, 75, 990, 275))
data = np.array(eagle_crop)
r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
dist = np.sqrt((r.astype(float) - 247)**2 + (g.astype(float) - 248)**2 + (b.astype(float) - 245)**2)
mask = dist < 32
data[:, :, 3] = np.where(mask, 0, 255)
eagle_transparent = Image.fromarray(data)
eagle_transparent.save(os.path.join(out_dir, 'eagle_clean.png'))
print('Saved eagle_clean.png')

# 1b. Calligraphy + Eagle combination with transparent background
combo_crop = im.crop((700, 75, 990, 275))
cdata = np.array(combo_crop)
cr, cg, cb = cdata[:,:,0], cdata[:,:,1], cdata[:,:,2]
cdist = np.sqrt((cr.astype(float) - 247)**2 + (cg.astype(float) - 248)**2 + (cb.astype(float) - 245)**2)
cmask = cdist < 32
cdata[:, :, 3] = np.where(cmask, 0, 255)
combo_transparent = Image.fromarray(cdata)
combo_transparent.save(os.path.join(out_dir, 'eagle_calligraphy_combo.png'))
print('Saved eagle_calligraphy_combo.png')

# 2. Extract Card 1: Interactive Map preview
# Looking at mockup: (58, 418, 334, 545)
card1_img = im.crop((58, 418, 334, 545)).convert('RGB')
card1_img.save(os.path.join(out_dir, 'feat_map.jpg'), quality=95)

# 3. Extract Card 2: Change Analysis preview
card2_img = im.crop((374, 418, 650, 545)).convert('RGB')
card2_img.save(os.path.join(out_dir, 'feat_change.jpg'), quality=95)

# 4. Extract Card 3: Hotspots Detection preview
card3_img = im.crop((691, 418, 966, 545)).convert('RGB')
card3_img.save(os.path.join(out_dir, 'feat_hotspots.jpg'), quality=95)

# 5. Extract Card 4: Species Insights preview
card4_img = im.crop((58, 684, 334, 811)).convert('RGB')
card4_img.save(os.path.join(out_dir, 'feat_species.jpg'), quality=95)

# 6. Extract Card 5: Reports & Data preview
card5_img = im.crop((374, 684, 650, 811)).convert('RGB')
card5_img.save(os.path.join(out_dir, 'feat_reports.jpg'), quality=95)

# 7. Extract Card 6: Community & Awareness preview
card6_img = im.crop((691, 684, 966, 811)).convert('RGB')
card6_img.save(os.path.join(out_dir, 'feat_community.jpg'), quality=95)

# 8. Extract Bottom Banner: Mountain forest canopy
banner_img = im.crop((0, 825, 1024, 997)).convert('RGB')
banner_img.save(os.path.join(out_dir, 'feat_banner.jpg'), quality=95)

print('All assets extracted successfully!')
