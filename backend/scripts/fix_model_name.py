#!/usr/bin/env python3
"""
Fix model name for hn-chat-leo deployment.
Updates model_id to point to GLM-4.7-FP8 and sets detected_model_name.
"""

import sys
import os

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import Deployment, Model, SessionLocal

SERVICE_NAME = "hn-chat-leo"
CORRECT_MODEL_NAME = "GLM-4.7-FP8"


def fix_model_name():
    db = SessionLocal()
    try:
        # Find the deployment
        deploy = db.query(Deployment).filter(
            Deployment.service_name == SERVICE_NAME
        ).first()

        if not deploy:
            print(f"Error: Deployment '{SERVICE_NAME}' not found")
            sys.exit(1)

        print(f"Found deployment: {deploy.service_name}")
        print(f"  Current model_id: {deploy.model_id}")
        print(f"  Current detected_model_name: {deploy.detected_model_name}")

        # Find the correct model
        model = db.query(Model).filter(
            Model.name == CORRECT_MODEL_NAME
        ).first()

        if not model:
            print(f"Error: Model '{CORRECT_MODEL_NAME}' not found in database")
            print("Please add the model first or check the name")
            sys.exit(1)

        print(f"\nTarget model: {model.name}")
        print(f"  Model ID: {model.id}")
        print(f"  Model path: {model.path}")

        # Update the deployment
        old_model_id = deploy.model_id
        deploy.model_id = model.id
        deploy.detected_model_name = CORRECT_MODEL_NAME
        db.commit()

        print(f"\nUpdated successfully:")
        print(f"  model_id: {old_model_id} -> {model.id}")
        print(f"  detected_model_name: {CORRECT_MODEL_NAME}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    fix_model_name()
