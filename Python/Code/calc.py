first_number = input( "enter first number: ")
choose_operator = input('enter operator (+, -, /, *, %): ')
second_number = input( "enter second number: ")

first_number = int(first_number)
second_number = int(second_number)

if (choose_operator == '+'):
    print("sum is: ", first_number + second_number)

elif (choose_operator == '-'):
    print("subtraction is: " , first_number - second_number)

elif (choose_operator == '*'):
    print("multiplication is: " , first_number * second_number) 

elif (choose_operator == '/'):
    print("division is: " , first_number / second_number)

elif (choose_operator == '%'):
    print("modulus is: " , first_number % second_number)

else: 
    print("invalid operator")
    