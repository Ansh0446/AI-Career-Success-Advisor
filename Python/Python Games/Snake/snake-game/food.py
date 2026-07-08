import random
from settings import *

class Food:
    def __init__(self):
        self.position = self.generate()

    def generate(self):
        return [
            random.randrange(0, WIDTH, BLOCK_SIZE),
            random.randrange(0, HEIGHT, BLOCK_SIZE)
        ]
