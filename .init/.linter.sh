#!/bin/bash
cd /home/kavia/workspace/code-generation/snakegame/SnakeXMonolithicGameApplication
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

