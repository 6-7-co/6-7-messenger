.PHONY: setup install db dev server client build up down k8s clean

setup:
	bash scripts/setup.sh

install:
	npm install
	npm --workspace server run db:generate

db:
	npm --workspace server run db:push
	npm --workspace server run db:seed

dev:
	npm run dev:server &
	npm run dev:client

server:
	npm run dev:server

client:
	npm run dev:client

build:
	npm run build:server
	npm run build:client

up:
	docker compose up -d

down:
	docker compose down

k8s:
	kubectl apply -k infra/k8s

clean:
	rm -rf node_modules server/dist client/out server/storage
