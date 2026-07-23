import sys
import base64
from io import BytesIO
from PIL import Image, ImageCms
import tempfile
import os
from pathlib import Path

# Import the legacy ImageProcessor from Fash-hit
sys.path.append(r"D:\HARSH\Fash-hit\backend")
try:
    from bg_remove import ImageProcessor, get_session
except ImportError as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)

def process_base64_image(base64_data):
    try:
        # Decode base64
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
        
        img_bytes = base64.b64decode(base64_data)
        img = Image.open(BytesIO(img_bytes))
        
        # Safely convert ICC color profiles (e.g. Display P3 -> sRGB)
        icc = img.info.get('icc_profile', '')
        if icc:
            try:
                icc_io = BytesIO(icc)
                src_profile = ImageCms.ImageCmsProfile(icc_io)
                dst_profile = ImageCms.createProfile('sRGB')
                img = ImageCms.profileToProfile(img, src_profile, dst_profile)
            except Exception as e:
                # Fallback to naive conversion if color profile is unreadable
                pass
        
        img = img.convert("RGB")
        
        # Save to temp path because ImageProcessor expects a Path
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp:
            temp_path = Path(temp.name)
            img.save(temp_path)
            
        try:
            processor = ImageProcessor()
            get_session() # initialize the AI model
            clean_img = processor.process_image(temp_path)
            
            if not clean_img:
                print("ERROR: Background removal failed to produce an image", file=sys.stderr)
                sys.exit(1)
                
            # Convert back to base64
            buffered = BytesIO()
            clean_img.save(buffered, format="PNG")
            clean_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            # Print output to stdout for Node.js to capture
            print("data:image/png;base64," + clean_b64)
        finally:
            os.unlink(temp_path)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Read base64 from stdin
    input_data = sys.stdin.read().strip()
    if not input_data:
        print("ERROR: No input provided", file=sys.stderr)
        sys.exit(1)
    process_base64_image(input_data)
