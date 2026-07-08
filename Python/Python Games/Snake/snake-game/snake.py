from settings import *

class Snake:
    def __init__(self):
        self.body = [
            [100,100],
            [80,100],
            [60,100]
        ]
        self.dx = BLOCK_SIZE
        self.dy = 0
