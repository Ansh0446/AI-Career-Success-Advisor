import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

# Load Dataset
df = pd.read_csv("dataset/datasetv4.csv")

# ------------------------
# Label Encoding
# ------------------------

le_degree = LabelEncoder()
df["degree"] = le_degree.fit_transform(df["degree"])

le_branch = LabelEncoder()
df["branch"] = le_branch.fit_transform(df["branch"])

le_goal = LabelEncoder()
df["goal"] = le_goal.fit_transform(df["goal"])

le_role = LabelEncoder()
df["target_role"] = le_role.fit_transform(df["target_role"])

# NEW COLUMN
le_sector = LabelEncoder()
df["sector"] = le_sector.fit_transform(df["sector"])

# Target Encoding
le_academic = LabelEncoder()
df["academic_category"] = le_academic.fit_transform(df["academic_category"])

# ------------------------
# Features (X) and Target (y)
# ------------------------

X = df.drop(columns=[
    "academic_category",
    "academic_score",
    "employability_score",
    "placement_probability"
])

y = df["academic_category"]

# ------------------------
# Train-Test Split
# ------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# ------------------------
# Check Shapes
# ------------------------

if __name__ == "__main__":
    print("X shape :", X.shape)
    print("y shape :", y.shape)

    print("X_train shape :", X_train.shape)
    print("X_test shape :", X_test.shape)

    print("y_train shape :", y_train.shape)
    print("y_test shape :", y_test.shape)

import joblib

joblib.dump(le_degree, "models/le_degree.pkl")
joblib.dump(le_branch, "models/le_branch.pkl")
joblib.dump(le_goal, "models/le_goal.pkl")
joblib.dump(le_role, "models/le_role.pkl")
joblib.dump(le_sector, "models/le_sector.pkl")
joblib.dump(le_academic, "models/le_academic.pkl")

print("Encoders Saved Successfully")