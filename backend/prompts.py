# prompts.py

# -------------------------------
# VISUAL PROMPTS
# -------------------------------

def generate_product_vs_product_prompt(req, category: str) -> str:
    df = req.dynamicFields  # all fields from frontend (mandatory + optional)

    return f"""
ROLE:
You are an elite creative director and commercial advertising visual strategist.

OBJECTIVE:
Design a powerful, high-converting BEFORE vs AFTER split-screen marketing visual
that clearly communicates transformation and emotional impact.

----------------------------------------
BUSINESS CONTEXT
----------------------------------------
Brand Name: {req.name}
Business Category: {category}
Target Persona: {req.persona}
Product / Service: {req.product}

Core Intent / Nature:
{req.imageType}

----------------------------------------
LEFT SIDE — BEFORE (Pain State)
----------------------------------------
Main Persona: {df.get("beforePersona", "")}
Primary Problem: {df.get("beforeProblem", "")}
Emotional State: {df.get("beforeEmotion", "")}
Environment Context: {df.get("beforeEnvironment", "")}
On-Image Headline: "{df.get("beforeText", "")}"

Visual Direction:
• Lighting: darker, low contrast, muted tones
• Expression: stressed / confused / struggling
• Composition: slightly cluttered or tense atmosphere

----------------------------------------
RIGHT SIDE — AFTER (Transformation State)
----------------------------------------
Same Persona — clearly improved and confident.

Support / Solution Used: {df.get("afterSupport", "")}
Outcome Achieved: {df.get("afterOutcome", "")}
Emotional State: {df.get("afterEmotion", "")}
On-Image Headline: "{df.get("afterText", "")}"

Visual Direction:
• Lighting: bright, clean, high contrast
• Expression: confident, relieved, empowered
• Composition: structured, premium, aspirational

----------------------------------------
OPTIONAL CREATIVE ENHANCEMENTS
----------------------------------------
Mood: {df.get("mood", "")}
Theme / Style: {df.get("theme", "")}
Tone of Communication: {df.get("tone", "")}
Color Preference: {df.get("colorPreference", "")}
Finish Quality: {df.get("finishType", "")}

If provided, these elements must subtly influence:
• Color grading
• Typography
• Background texture
• Camera angle
• Styling details

----------------------------------------
BRAND INTEGRATION
----------------------------------------
• Place "{req.name}" elegantly at the top-center.
• Premium typography.
• Subtle brand glow or luxury accent.
• Keep logo placement natural and professional.

----------------------------------------
STYLE SPECIFICATIONS
----------------------------------------
Ultra-realistic.
Commercial advertising quality.
Cinematic lighting.
4K resolution.
Aspect Ratio: 16:9.

----------------------------------------
IMPORTANT RULES
----------------------------------------
• Clear visual contrast between BEFORE and AFTER.
• Emotion must be instantly recognizable.
• No clutter.
• No cartoonish style.
• Premium realism only.
• Make it scroll-stopping for social media ads.
""".strip()


# -------------------------------
# PROMPT ROUTER
# -------------------------------



def build_prompt(req, category: str) -> str:

    # VISUALS
    if req.mode == "visuals":

        if req.mediaType == "comparative":
            if req.subType == "Product A vs Product B":
                return generate_product_vs_product_prompt(req, category)




    raise ValueError("Invalid media configuration selected")

