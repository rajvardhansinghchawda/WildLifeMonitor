import os
from PIL import Image
import numpy as np

mockup_path = r'C:\Users\kanheya\.gemini\antigravity-ide\brain\6272d111-76c6-4df5-87f5-e83630cad55b\.user_uploaded\media_1789765298328.jpg'
out_dir = r'd:\codeniti new\frontend\public\blogs'
os.makedirs(out_dir, exist_ok=True)

im = Image.open(mockup_path).convert('RGBA')
w, h = im.size
print(f'Blog Mockup size: {w}x{h}')

# 1. Hero background (from y: 0 down to roughly y: 440)
# To keep it clean as a background, let's extract the top mountain valley scene
hero_bg = im.crop((0, 0, 1024, 430)).convert('RGB')
hero_bg_2x = hero_bg.resize((hero_bg.width * 2, hero_bg.height * 2), Image.Resampling.LANCZOS)
hero_bg_2x.save(os.path.join(out_dir, 'hero_valley.jpg'), quality=95)
print('Saved hero_valley.jpg')

# 2. Calligraphy note under backpacker: "Ideas today. A healthier tomorrow."
# Coordinates roughly: x: 800 to 970, y: 310 to 415
note_crop = im.crop((830, 310, 955, 410))
# Make background transparent or keep as transparent overlay
ndata = np.array(note_crop)
# The background is dark rock cliff/mountain: (around 40-70 range)
# But wait, we can also render the text natively in HTML/CSS with Caveat or Google Font or use the crop
note_crop.convert('RGB').save(os.path.join(out_dir, 'hiker_note.jpg'), quality=95)
print('Saved hiker_note.jpg')

# 3. Card 1: Savanna Elephants
# In mockup: Card 1 image box is roughly x: 45 to 337, y: 460 to 615
card1_crop = im.crop((46, 461, 338, 615)).convert('RGB')
card1_2x = card1_crop.resize((card1_crop.width * 2, card1_crop.height * 2), Image.Resampling.LANCZOS)
card1_2x.save(os.path.join(out_dir, 'blog_elephants.jpg'), quality=95)
print('Saved blog_elephants.jpg')

# 4. Card 2: Humpback Whale
# In mockup: Card 2 image box is roughly x: 355 to 648, y: 460 to 615
card2_crop = im.crop((355, 461, 649, 615)).convert('RGB')
card2_2x = card2_crop.resize((card2_crop.width * 2, card2_crop.height * 2), Image.Resampling.LANCZOS)
card2_2x.save(os.path.join(out_dir, 'blog_whale.jpg'), quality=95)
print('Saved blog_whale.jpg')

# 5. Card 3: Rainforest River Aerial Canopy
# In mockup: Card 3 image box is roughly x: 665 to 958, y: 460 to 615
card3_crop = im.crop((665, 461, 959, 615)).convert('RGB')
card3_2x = card3_crop.resize((card3_crop.width * 2, card3_crop.height * 2), Image.Resampling.LANCZOS)
card3_2x.save(os.path.join(out_dir, 'blog_forest.jpg'), quality=95)
print('Saved blog_forest.jpg')

# 6. Botanical Leafy Branch in Quote Card
# In mockup: Quote card is at bottom left (roughly x: 45 to 595, y: 825 to 935)
# Leaf branch is on right side of quote card (roughly x: 480 to 595, y: 840 to 948)
leaf_crop = im.crop((485, 845, 595, 950))
ldata = np.array(leaf_crop)
lr, lg, lb = ldata[:,:,0], ldata[:,:,1], ldata[:,:,2]
# Background is sage/light ivory: around (230-245, 238-248, 230-245)
# Make light background transparent
ldist = np.sqrt((lr.astype(float) - 238)**2 + (lg.astype(float) - 244)**2 + (lb.astype(float) - 236)**2)
lmask = ldist < 35
ldata[:, :, 3] = np.where(lmask, 0, 255)
leaf_trans = Image.fromarray(ldata)
leaf_trans_2x = leaf_trans.resize((leaf_trans.width * 2, leaf_trans.height * 2), Image.Resampling.LANCZOS)
leaf_trans_2x.save(os.path.join(out_dir, 'leafy_branch.png'))
print('Saved leafy_branch.png')

print('All blog assets processed successfully!')
