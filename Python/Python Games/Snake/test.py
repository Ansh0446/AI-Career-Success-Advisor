import pygame

pygame.init()

screen = pygame.display.set_mode((600, 400))
pygame.display.set_caption("Snake Game")

running = True

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    screen.fill((30, 30, 30))
    pygame.display.flip()

pygame.quit()