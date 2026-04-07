.PHONY: install dev build clean lint format

install:
	npm install

dev:
	npm run tauri dev

build:
	npm run tauri build

clean:
	npm run clean --if-present || (rm -rf dist && rm -rf src-tauri/target)

lint:
	npm run lint

format:
	npm run format
