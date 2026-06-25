import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("dataset/datasetv3.csv")

#Academic Category Distribution
print(df["academic_category"].value_counts())

df["academic_category"].value_counts().plot(kind="bar")

plt.title("Academic Category Distribution")
plt.xlabel("Category")
plt.ylabel("Number of Students")

plt.show()

#CGPA Distribution
plt.hist(df["cgpa"], bins=10)

plt.title("CGPA Distribution")
plt.xlabel("CGPA")
plt.ylabel("Students")

plt.show()

#Projects vs Employability Score
plt.scatter(df["projects_count"], df["employability_score"])

plt.xlabel("Projects Count")
plt.ylabel("Employability Score")
plt.title("Projects vs Employability")

plt.show()

#Attendance vs Academic Score
plt.scatter(df["attendance"], df["academic_score"])

plt.xlabel("Attendance")
plt.ylabel("Academic Score")

plt.show()

#Placement Probability Histogram
plt.hist(df["placement_probability"], bins=10)

plt.xlabel("Placement Probability")
plt.ylabel("Students")
plt.title("Placement Probability Distribution")

plt.show()

#Correlation Matrix
corr = df.corr(numeric_only=True)

print(corr)