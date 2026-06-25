# Import dataset
from preprocessing import df

# Libraries
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error
)

import pandas as pd
import numpy as np

# -------------------------
# Features and Target
# -------------------------

X_emp = df.drop(columns=[
    "employability_score",
    "placement_probability",
    "sector"
])

y_emp = df["employability_score"]

# -------------------------
# Train-Test Split
# -------------------------

X_train_emp, X_test_emp, y_train_emp, y_test_emp = train_test_split(
    X_emp,
    y_emp,
    test_size=0.2,
    random_state=42
)

# -------------------------
# Create Model
# -------------------------

model_emp = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

# -------------------------
# Train Model
# -------------------------

model_emp.fit(
    X_train_emp,
    y_train_emp
)

# -------------------------
# Predictions
# -------------------------

y_pred_emp = model_emp.predict(
    X_test_emp
)

# -------------------------
# Evaluation
# -------------------------

print("R2 Score:")
print(r2_score(
    y_test_emp,
    y_pred_emp
))

print("\nMean Absolute Error:")
print(mean_absolute_error(
    y_test_emp,
    y_pred_emp
))

print("\nMean Squared Error:")
print(mean_squared_error(
    y_test_emp,
    y_pred_emp
))

print("\nRoot Mean Squared Error:")
print(
    np.sqrt(
        mean_squared_error(
            y_test_emp,
            y_pred_emp
        )
    )
)

# -------------------------
# Feature Importance
# -------------------------

importance_df = pd.DataFrame({
    "Feature": X_train_emp.columns,
    "Importance": model_emp.feature_importances_
})

importance_df = importance_df.sort_values(
    by="Importance",
    ascending=False
)

print("\nFeature Importance:")
print(importance_df)

# -------------------------
# Top 10 Features
# -------------------------

print("\nTop 10 Features:")
print(
    importance_df.head(10)
)

import joblib

joblib.dump(
    model_emp,
    "models/employability_model.pkl"
)
print("Employability Model Saved Successfully")
