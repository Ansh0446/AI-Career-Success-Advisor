def read_high_score():
    try:
        with open("highscore.txt","r") as f:
            return int(f.read())
    except:
        return 0

def save_high_score(score):
    with open("highscore.txt","w") as f:
        f.write(str(score))
