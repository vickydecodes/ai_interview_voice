from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId

from app.database import get_users_collection
from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    users_col = get_users_collection()
    
    # Check if email exists
    normalized_email = user_data.email.lower().strip()
    existing_user = await users_col.find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    now = datetime.now(timezone.utc)
    new_user_doc = {
        "email": normalized_email,
        "full_name": user_data.full_name or normalized_email.split("@")[0].capitalize(),
        "hashed_password": hash_password(user_data.password),
        "level": 1,
        "xp": 0,
        "badges": ["Beginner Explorer"],
        "created_at": now,
        "updated_at": now,
    }

    result = await users_col.insert_one(new_user_doc)
    user_id_str = str(result.inserted_id)

    access_token = create_access_token(data={"sub": user_id_str, "email": normalized_email})

    user_resp = UserResponse(
        id=user_id_str,
        email=normalized_email,
        full_name=new_user_doc["full_name"],
        level=new_user_doc["level"],
        xp=new_user_doc["xp"],
        badges=new_user_doc["badges"],
        created_at=now,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp,
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    users_col = get_users_collection()
    normalized_email = credentials.email.lower().strip()

    user = await users_col.find_one({"email": normalized_email})
    if not user or not verify_password(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id_str, "email": normalized_email})

    user_resp = UserResponse(
        id=user_id_str,
        email=user["email"],
        full_name=user.get("full_name", ""),
        level=user.get("level", 1),
        xp=user.get("xp", 0),
        badges=user.get("badges", []),
        created_at=user.get("created_at"),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp,
    )


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        full_name=current_user.get("full_name", ""),
        level=current_user.get("level", 1),
        xp=current_user.get("xp", 0),
        badges=current_user.get("badges", []),
        created_at=current_user.get("created_at"),
    )
