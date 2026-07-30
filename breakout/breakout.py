"""블록깨기 (Breakout) - Pygame으로 만든 실행 가능한 게임.

실행: python breakout.py
조작: 좌우 화살표 또는 A/D 키로 패들 이동, 스페이스바로 공 발사, R 키로 재시작
"""

import sys
import random
import pygame

# ---------- 설정값 ----------
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PADDLE_WIDTH = 100
PADDLE_HEIGHT = 15
PADDLE_SPEED = 8
PADDLE_Y_OFFSET = 40

BALL_RADIUS = 8
BALL_SPEED = 5

BRICK_ROWS = 6
BRICK_COLS = 10
BRICK_WIDTH = 72
BRICK_HEIGHT = 24
BRICK_PADDING = 6
BRICK_TOP_OFFSET = 60
BRICK_LEFT_OFFSET = (SCREEN_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) // 2

LIVES_START = 3

WHITE = (255, 255, 255)
BLACK = (20, 20, 20)
GRAY = (160, 160, 160)
RED = (220, 60, 60)

ROW_COLORS = [
    (231, 76, 60),
    (230, 126, 34),
    (241, 196, 15),
    (46, 204, 113),
    (52, 152, 219),
    (155, 89, 182),
]


class Paddle:
    def __init__(self):
        self.width = PADDLE_WIDTH
        self.height = PADDLE_HEIGHT
        self.rect = pygame.Rect(
            (SCREEN_WIDTH - self.width) // 2,
            SCREEN_HEIGHT - PADDLE_Y_OFFSET,
            self.width,
            self.height,
        )

    def move(self, dx):
        self.rect.x += dx
        self.rect.x = max(0, min(SCREEN_WIDTH - self.width, self.rect.x))

    def draw(self, surface):
        pygame.draw.rect(surface, WHITE, self.rect, border_radius=6)


class Ball:
    def __init__(self, paddle):
        self.radius = BALL_RADIUS
        self.paddle = paddle
        self.reset()

    def reset(self):
        self.stuck_to_paddle = True
        self.x = self.paddle.rect.centerx
        self.y = self.paddle.rect.top - self.radius
        self.vx = 0
        self.vy = 0

    def launch(self):
        if self.stuck_to_paddle:
            self.stuck_to_paddle = False
            angle_choices = [-1, -0.6, -0.3, 0.3, 0.6, 1]
            self.vx = BALL_SPEED * random.choice(angle_choices)
            self.vy = -BALL_SPEED

    def update(self):
        if self.stuck_to_paddle:
            self.x = self.paddle.rect.centerx
            self.y = self.paddle.rect.top - self.radius
            return

        self.x += self.vx
        self.y += self.vy

        if self.x - self.radius <= 0:
            self.x = self.radius
            self.vx *= -1
        elif self.x + self.radius >= SCREEN_WIDTH:
            self.x = SCREEN_WIDTH - self.radius
            self.vx *= -1

        if self.y - self.radius <= 0:
            self.y = self.radius
            self.vy *= -1

    def get_rect(self):
        return pygame.Rect(
            self.x - self.radius, self.y - self.radius, self.radius * 2, self.radius * 2
        )

    def draw(self, surface):
        pygame.draw.circle(surface, WHITE, (int(self.x), int(self.y)), self.radius)


class Brick:
    def __init__(self, x, y, color):
        self.rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
        self.color = color
        self.alive = True

    def draw(self, surface):
        if self.alive:
            pygame.draw.rect(surface, self.color, self.rect, border_radius=4)
            pygame.draw.rect(surface, BLACK, self.rect, width=1, border_radius=4)


def create_bricks():
    bricks = []
    for row in range(BRICK_ROWS):
        for col in range(BRICK_COLS):
            x = BRICK_LEFT_OFFSET + col * (BRICK_WIDTH + BRICK_PADDING)
            y = BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_PADDING)
            bricks.append(Brick(x, y, ROW_COLORS[row % len(ROW_COLORS)]))
    return bricks


def handle_ball_paddle_collision(ball, paddle):
    if ball.vy > 0 and ball.get_rect().colliderect(paddle.rect):
        offset = (ball.x - paddle.rect.centerx) / (paddle.width / 2)
        offset = max(-1, min(1, offset))
        speed = (ball.vx ** 2 + ball.vy ** 2) ** 0.5
        max_angle = 1.0
        ball.vx = speed * offset * max_angle
        ball.vy = -abs(ball.vy)
        ball.y = paddle.rect.top - ball.radius


def handle_ball_brick_collisions(ball, bricks):
    ball_rect = ball.get_rect()
    for brick in bricks:
        if not brick.alive:
            continue
        if ball_rect.colliderect(brick.rect):
            brick.alive = False

            overlap_left = ball_rect.right - brick.rect.left
            overlap_right = brick.rect.right - ball_rect.left
            overlap_top = ball_rect.bottom - brick.rect.top
            overlap_bottom = brick.rect.bottom - ball_rect.top

            min_overlap = min(overlap_left, overlap_right, overlap_top, overlap_bottom)
            if min_overlap in (overlap_left, overlap_right):
                ball.vx *= -1
            else:
                ball.vy *= -1
            return 1
    return 0


def draw_text(surface, text, size, color, center):
    font = pygame.font.SysFont("malgungothic,arial", size)
    rendered = font.render(text, True, color)
    rect = rendered.get_rect(center=center)
    surface.blit(rendered, rect)


def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("블록깨기 - Breakout")
    clock = pygame.time.Clock()

    paddle = Paddle()
    ball = Ball(paddle)
    bricks = create_bricks()

    score = 0
    lives = LIVES_START
    game_over = False
    win = False

    running = True
    while running:
        dt = clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_SPACE:
                    ball.launch()
                elif event.key == pygame.K_r and (game_over or win):
                    paddle = Paddle()
                    ball = Ball(paddle)
                    bricks = create_bricks()
                    score = 0
                    lives = LIVES_START
                    game_over = False
                    win = False

        if not game_over and not win:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                paddle.move(-PADDLE_SPEED)
            if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                paddle.move(PADDLE_SPEED)

            ball.update()
            handle_ball_paddle_collision(ball, paddle)
            score += handle_ball_brick_collisions(ball, bricks) * 10

            if ball.y - ball.radius > SCREEN_HEIGHT:
                lives -= 1
                if lives <= 0:
                    game_over = True
                else:
                    ball.reset()

            if all(not b.alive for b in bricks):
                win = True

        screen.fill(BLACK)
        for brick in bricks:
            brick.draw(screen)
        paddle.draw(screen)
        ball.draw(screen)

        draw_text(screen, f"Score: {score}", 24, WHITE, (70, 20))
        draw_text(screen, f"Lives: {lives}", 24, WHITE, (SCREEN_WIDTH - 70, 20))

        if ball.stuck_to_paddle and not game_over and not win:
            draw_text(screen, "스페이스바를 눌러 공을 발사하세요", 20, GRAY, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))

        if game_over:
            draw_text(screen, "GAME OVER", 48, RED, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20))
            draw_text(screen, "R 키를 눌러 재시작", 24, WHITE, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30))
        elif win:
            draw_text(screen, "YOU WIN!", 48, (46, 204, 113), (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20))
            draw_text(screen, "R 키를 눌러 재시작", 24, WHITE, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30))

        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
