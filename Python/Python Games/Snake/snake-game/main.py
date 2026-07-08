import pygame
import sys
from settings import *
from snake import Snake
from food import Food
from utils import read_high_score, save_high_score

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Snake Game")
clock = pygame.time.Clock()

font = pygame.font.SysFont("Arial",28)
big_font = pygame.font.SysFont("Arial",50)

snake = Snake()
food = Food()

score = 0
speed = FPS
game_over = False
high_score = read_high_score()

running = True

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running=False

        if event.type == pygame.KEYDOWN:
            if game_over and event.key == pygame.K_r:
                snake = Snake()
                food = Food()
                score = 0
                speed = FPS
                game_over = False

            if not game_over:
                if event.key == pygame.K_UP and snake.dy == 0:
                    snake.dx=0; snake.dy=-BLOCK_SIZE
                elif event.key == pygame.K_DOWN and snake.dy == 0:
                    snake.dx=0; snake.dy=BLOCK_SIZE
                elif event.key == pygame.K_LEFT and snake.dx == 0:
                    snake.dx=-BLOCK_SIZE; snake.dy=0
                elif event.key == pygame.K_RIGHT and snake.dx == 0:
                    snake.dx=BLOCK_SIZE; snake.dy=0

    if not game_over:
        new_head=[snake.body[0][0]+snake.dx,snake.body[0][1]+snake.dy]
        snake.body.insert(0,new_head)

        if new_head==food.position:
            score += 1
            if score > high_score:
                high_score = score
                save_high_score(high_score)
            if score % 5 == 0:
                speed += 2
            food.position = food.generate()
        else:
            snake.body.pop()

        if new_head[0] < 0 or new_head[0] >= WIDTH or new_head[1] < 0 or new_head[1] >= HEIGHT:
            game_over=True

        if new_head in snake.body[1:]:
            game_over=True

    screen.fill(BACKGROUND)

    for i, block in enumerate(snake.body):
        color = HEAD if i==0 else GREEN
        pygame.draw.rect(screen,color,(block[0],block[1],BLOCK_SIZE,BLOCK_SIZE))

    pygame.draw.circle(screen,RED,(food.position[0]+BLOCK_SIZE//2,food.position[1]+BLOCK_SIZE//2),BLOCK_SIZE//2)

    screen.blit(font.render(f"Score: {score}",True,WHITE),(10,10))
    screen.blit(font.render(f"High Score: {high_score}",True,YELLOW),(300,10))

    if game_over:
        screen.blit(big_font.render("GAME OVER",True,RED),(145,230))
        screen.blit(font.render("Press R to Restart",True,WHITE),(165,300))

    pygame.display.flip()
    clock.tick(speed)

pygame.quit()
sys.exit()
