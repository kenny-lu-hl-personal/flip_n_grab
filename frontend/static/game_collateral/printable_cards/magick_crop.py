import os
'''
uses imagemagick.exe 
https://imagemagick.org/script/command-line-options.php#crop
'''

card_dimension = 796
card_interval = 798
start_x = 50
start_y = 115

pattern = 0 
colors = ['yellow', 'green', 'blue', 'red']
pages = ['0002.jpg', '0003.jpg', '0004.jpg', '0005.jpg', '0006.jpg', '0007.jpg']

#pattern cards
#for page in pages:
#    x = start_x
#    y = start_y
#    for i in range(3):
#        for color in colors:
#            os.system(f'magick convert {page} -crop {card_dimension}x{card_dimension}+{x}+{y} cards/{color}_{pattern}.jpg')
#            y += card_interval
#        pattern += 1
#        y = start_y
#        x += card_interval

#special cards
x = start_x
y = start_y
pattern = 0
for i in range(3):
    os.system(f'magick convert 0008.jpg -crop {card_dimension}x{card_dimension}+{x}+{y} cards/special_{pattern}.jpg')
    pattern += 1
    x += card_interval

