for i in range(5):
    print(i)

print (' ')
i= 1
while i<=5:
    print(i * '*')
    i=i+1    # i+=1

print (' ')
i= 1
while i<=5:
    space = " " * (5-i)
    star = (2*i-1) * '*'
    print(space + star)
    i=i+1    # i+=1

    