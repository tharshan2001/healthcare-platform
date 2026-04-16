import logging
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    from main import app
    uvicorn.run(app, host="0.0.0.0", port=8004)