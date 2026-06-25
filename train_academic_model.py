# Import preprocessed data
from preprocessing import X_train, X_test, y_train, y_test

# Import libraries
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pandas as pd

# -------------------------
# Create Model
# -------------------------

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

# -------------------------
# Train Model
# -------------------------

model.fit(X_train, y_train)

# -------------------------
# Make Predictions
# -------------------------

y_pred = model.predict(X_test)

# -------------------------
# Model Evaluation
# -------------------------

accuracy = accuracy_score(y_test, y_pred)

print("Accuracy:")
print(accuracy)

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# -------------------------
# Feature Importance
# -------------------------

importance_df = pd.DataFrame({
    "Feature": X_train.columns,
    "Importance": model.feature_importances_
})

importance_df = importance_df.sort_values(
    by="Importance",
    ascending=False
)

print("\nFeature Importance:")
print(importance_df)

# -------------------------
# Top 10 Important Features
# -------------------------

print("\nTop 10 Features:")

print(
    importance_df.head(10)
)

import joblib

joblib.dump(
    model,
    "models/academic_model.pkl"
)
print("Academic Model Saved Successfully")