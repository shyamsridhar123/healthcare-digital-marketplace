FROM mcr.microsoft.com/azure-functions/node:4-node20 AS build

WORKDIR /src

COPY package*.json ./
RUN npm install

COPY tsconfig.json host.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM mcr.microsoft.com/azure-functions/node:4-node20

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=node

WORKDIR /home/site/wwwroot

COPY --from=build /src/package*.json ./
COPY --from=build /src/node_modules ./node_modules
COPY --from=build /src/host.json ./
COPY --from=build /src/dist ./dist
