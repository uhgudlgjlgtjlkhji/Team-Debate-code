from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import hashlib
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== Models ====================

class TeamCreate(BaseModel):
    createdBy: str

class TeamConfig(BaseModel):
    topic: Optional[str] = ""
    side: Optional[str] = "prop"

class TeamResponse(BaseModel):
    code: str
    topic: str
    side: str
    createdAt: str
    createdBy: str

class SpeakerData(BaseModel):
    speech: str = ""
    comments: List[dict] = []
    hasPassword: bool = False

class SpeakerUpdate(BaseModel):
    speech: str

class PasswordSet(BaseModel):
    password: str

class PasswordVerify(BaseModel):
    password: str

class CommentCreate(BaseModel):
    author: str
    color: str
    text: str

class AIGenerateSpeech(BaseModel):
    topic: str
    side: str
    speakerRole: str
    existingContent: Optional[str] = ""

class AIGenerateRebuttal(BaseModel):
    topic: str
    side: str
    opposingArgument: str

class AICoachMessage(BaseModel):
    sessionId: str
    message: str
    topic: str
    side: str

class AIBrainstorm(BaseModel):
    topic: str
    side: str

# ==================== Helper Functions ====================

def generate_team_code() -> str:
    """Generate a 6-character team code"""
    return uuid.uuid4().hex[:6].upper()

def hash_password(password: str) -> str:
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

async def get_ai_response(system_message: str, user_message: str, session_id: str = None) -> str:
    """Get AI response using Claude via Emergent LLM"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id or str(uuid.uuid4()),
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        msg = UserMessage(text=user_message)
        response = await chat.send_message(msg)
        return response
    except Exception as e:
        logger.error(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# ==================== Team Routes ====================

@api_router.get("/")
async def root():
    return {"message": "DebateForge API"}

@api_router.post("/teams", response_model=TeamResponse)
async def create_team(data: TeamCreate):
    code = generate_team_code()
    team = {
        "code": code,
        "topic": "",
        "side": "prop",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdBy": data.createdBy
    }
    await db.teams.insert_one(team)
    
    # Initialize speaker documents
    for speaker_id in ["s1", "s2", "s3"]:
        await db.speakers.insert_one({
            "teamCode": code,
            "speakerId": speaker_id,
            "speech": "",
            "passHash": None,
            "comments": []
        })
    
    return TeamResponse(**team)

@api_router.get("/teams/{code}", response_model=TeamResponse)
async def get_team(code: str):
    team = await db.teams.find_one({"code": code.upper()}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return TeamResponse(**team)

@api_router.put("/teams/{code}/config", response_model=TeamResponse)
async def update_team_config(code: str, config: TeamConfig):
    result = await db.teams.find_one_and_update(
        {"code": code.upper()},
        {"$set": {"topic": config.topic, "side": config.side}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Team not found")
    result.pop("_id", None)
    return TeamResponse(**result)

# ==================== Speaker Routes ====================

@api_router.get("/speakers/{code}/{speaker_id}", response_model=SpeakerData)
async def get_speaker(code: str, speaker_id: str):
    speaker = await db.speakers.find_one(
        {"teamCode": code.upper(), "speakerId": speaker_id},
        {"_id": 0}
    )
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return SpeakerData(
        speech=speaker.get("speech", ""),
        comments=speaker.get("comments", []),
        hasPassword=speaker.get("passHash") is not None
    )

@api_router.put("/speakers/{code}/{speaker_id}")
async def update_speaker(code: str, speaker_id: str, data: SpeakerUpdate):
    result = await db.speakers.update_one(
        {"teamCode": code.upper(), "speakerId": speaker_id},
        {"$set": {"speech": data.speech}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return {"success": True}

@api_router.post("/speakers/{code}/{speaker_id}/password/set")
async def set_speaker_password(code: str, speaker_id: str, data: PasswordSet):
    pass_hash = hash_password(data.password)
    result = await db.speakers.update_one(
        {"teamCode": code.upper(), "speakerId": speaker_id},
        {"$set": {"passHash": pass_hash}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return {"success": True}

@api_router.post("/speakers/{code}/{speaker_id}/password/verify")
async def verify_speaker_password(code: str, speaker_id: str, data: PasswordVerify):
    speaker = await db.speakers.find_one(
        {"teamCode": code.upper(), "speakerId": speaker_id},
        {"_id": 0, "passHash": 1}
    )
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    if speaker.get("passHash") is None:
        return {"valid": True, "hasPassword": False}
    
    pass_hash = hash_password(data.password)
    return {"valid": pass_hash == speaker["passHash"], "hasPassword": True}

@api_router.delete("/speakers/{code}/{speaker_id}/password")
async def remove_speaker_password(code: str, speaker_id: str):
    result = await db.speakers.update_one(
        {"teamCode": code.upper(), "speakerId": speaker_id},
        {"$set": {"passHash": None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return {"success": True}

# ==================== Comments Routes ====================

@api_router.post("/comments/{code}/{speaker_id}")
async def add_comment(code: str, speaker_id: str, data: CommentCreate):
    comment = {
        "author": data.author,
        "color": data.color,
        "text": data.text,
        "ts": datetime.now(timezone.utc).isoformat()
    }
    result = await db.speakers.update_one(
        {"teamCode": code.upper(), "speakerId": speaker_id},
        {"$push": {"comments": comment}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return {"success": True}

@api_router.delete("/comments/{code}/{speaker_id}")
async def clear_comments(code: str, speaker_id: str):
    result = await db.speakers.update_one(
        {"teamCode": code.upper(), "speakerId": speaker_id},
        {"$set": {"comments": []}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return {"success": True}

# ==================== AI Routes ====================

@api_router.post("/ai/generate-speech")
async def generate_speech(data: AIGenerateSpeech):
    speaker_names = {
        "s1": "First Speaker (Opening)",
        "s2": "Second Speaker (Rebuttal & Extension)",
        "s3": "Third Speaker (Summary & Whip)"
    }
    speaker_name = speaker_names.get(data.speakerRole, "Speaker")
    side_name = "Proposition" if data.side == "prop" else "Opposition"
    
    system_message = f"""You are an expert debate coach helping write competitive debate speeches. 
You write clear, persuasive, and well-structured speeches suitable for parliamentary or British Parliamentary debate format.
Always use strong rhetoric, logical arguments, and compelling examples."""

    user_prompt = f"""Write a complete {speaker_name} speech for the {side_name} side.

Motion: {data.topic}

Requirements for {speaker_name}:
{"- Establish the debate framing and key definitions" if data.speakerRole == "s1" else ""}
{"- Present 2-3 strong, distinct arguments" if data.speakerRole == "s1" else ""}
{"- Rebut key opposition arguments" if data.speakerRole in ["s2", "s3"] else ""}
{"- Extend and deepen existing arguments" if data.speakerRole == "s2" else ""}
{"- Provide new material and examples" if data.speakerRole == "s2" else ""}
{"- Summarize the key clash points" if data.speakerRole == "s3" else ""}
{"- Crystallize why your side wins" if data.speakerRole == "s3" else ""}

{f"Build upon this existing content: {data.existingContent}" if data.existingContent else ""}

Write a 4-6 minute speech (approximately 600-900 words). Use clear structure with signposting."""

    response = await get_ai_response(system_message, user_prompt)
    return {"speech": response}

@api_router.post("/ai/generate-rebuttal")
async def generate_rebuttal(data: AIGenerateRebuttal):
    side_name = "Proposition" if data.side == "prop" else "Opposition"
    
    system_message = """You are an expert debate coach specializing in rebuttal strategies.
You help debaters craft sharp, effective responses to opposing arguments."""

    user_prompt = f"""Generate a strong rebuttal from the {side_name} perspective.

Motion: {data.topic}
Opposing argument to rebut: {data.opposingArgument}

Provide:
1. A direct response attacking the logic/evidence
2. A counter-example or alternative framing
3. An explanation of why this strengthens your side

Keep it concise but devastating (150-250 words)."""

    response = await get_ai_response(system_message, user_prompt)
    return {"rebuttal": response}

@api_router.post("/ai/brainstorm")
async def brainstorm_arguments(data: AIBrainstorm):
    side_name = "Proposition" if data.side == "prop" else "Opposition"
    
    system_message = """You are an expert debate strategist helping teams brainstorm arguments.
You think creatively and identify both obvious and unexpected angles."""

    user_prompt = f"""Brainstorm arguments for the {side_name} side.

Motion: {data.topic}

Provide:
1. 3-4 strong main arguments with brief explanations
2. 2-3 potential opposition arguments to prepare for
3. Key examples or case studies that could be useful
4. Any important definitions or framing considerations

Be concise but comprehensive."""

    response = await get_ai_response(system_message, user_prompt)
    return {"ideas": response}

@api_router.post("/ai/coach")
async def ai_coach(data: AICoachMessage):
    side_name = "Proposition" if data.side == "prop" else "Opposition"
    
    system_message = f"""You are an experienced debate coach helping a team prepare for a debate.
The team is arguing the {side_name} side on the motion: "{data.topic}"

You provide strategic advice, help with arguments, suggest rebuttals, and offer encouragement.
Be helpful, specific, and constructive. Draw on debate best practices and rhetorical techniques."""

    response = await get_ai_response(system_message, data.message, data.sessionId)
    return {"response": response}

# ==================== All Speakers Status ====================

@api_router.get("/speakers/{code}/all/status")
async def get_all_speakers_status(code: str):
    speakers = await db.speakers.find(
        {"teamCode": code.upper()},
        {"_id": 0, "speakerId": 1, "speech": 1, "comments": 1, "passHash": 1}
    ).to_list(10)
    
    result = {}
    for speaker in speakers:
        result[speaker["speakerId"]] = {
            "hasContent": len(speaker.get("speech", "")) > 0,
            "wordCount": len(speaker.get("speech", "").split()) if speaker.get("speech") else 0,
            "commentCount": len(speaker.get("comments", [])),
            "isLocked": speaker.get("passHash") is not None
        }
    return result

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
