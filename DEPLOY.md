# Deploy do DriveTools MS no Azure Static Web Apps

Este guia descreve os passos manuais necessários para publicar o app no Azure Static Web Apps com deploy automático a cada push na branch `main`.

## Pré-requisitos

- Conta Azure ativa (Free tier serve)
- Repositório GitHub já criado em `https://github.com/rodprado128/drivetoolsms`
- Permissão de admin no repositório para o GitHub Actions criar workflow

## Passo 1. Criar o Static Web App no portal Azure

1. Acesse https://portal.azure.com e faça login.
2. No topo, clique em **Criar um recurso**.
3. Pesquise por **Static Web App** e clique em **Criar**.
4. Preencha o formulário:
   - **Assinatura**: sua assinatura ativa
   - **Grupo de recursos**: crie um novo, ex: `rg-drivetools-ms`
   - **Nome**: `drivetools-ms` (ou outro disponível)
   - **Tipo de plano**: **Free**
   - **Região para APIs do Azure Functions**: a mais próxima, ex: `East US 2`
   - **Detalhes do deployment**:
     - Origem: **GitHub**
     - Faça login no GitHub e autorize o Azure
     - Organização: `rodprado128`
     - Repositório: `drivetoolsms`
     - Branch: `main`
   - **Detalhes do build**:
     - Predefinição do build: **Custom**
     - Localização do app: `/`
     - Localização da API: (deixe em branco)
     - Localização de saída: `dist`
5. Clique em **Revisar + criar** e depois em **Criar**.

## Passo 2. Obter o token de deploy

Quando o Static Web App for criado, o Azure automaticamente:
- Cria um workflow em `.github/workflows/azure-static-web-apps-NOME.yml` no seu repo
- Cria o secret `AZURE_STATIC_WEB_APPS_API_TOKEN` (ou variação) no GitHub

**Importante**: este projeto já tem um workflow em `.github/workflows/azure-static-web-apps.yml`. Você tem duas opções:

### Opção A. Usar o workflow do projeto (recomendado)

1. No portal Azure, abra o Static Web App criado.
2. Vá em **Visão geral** > **Gerenciar token de deploy** (botão no topo).
3. Copie o token exibido.
4. No GitHub, vá em `https://github.com/rodprado128/drivetoolsms/settings/secrets/actions`.
5. Clique em **New repository secret**:
   - Nome: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Valor: cole o token copiado
6. Delete o workflow gerado automaticamente pelo Azure (`.github/workflows/azure-static-web-apps-NOME.yml`) se existir, mantendo apenas o `azure-static-web-apps.yml` do projeto.

### Opção B. Usar o workflow gerado pelo Azure

1. Delete o `.github/workflows/azure-static-web-apps.yml` do projeto.
2. Faça pull do workflow gerado pelo Azure.

## Passo 3. Configurar variáveis de ambiente do build

O app precisa do Client ID e Tenant ID do Entra ID em tempo de build. Adicione como secrets:

1. No GitHub, vá em `https://github.com/rodprado128/drivetoolsms/settings/secrets/actions`.
2. Adicione os seguintes secrets:
   - `VITE_GRAPH_CLIENT_ID` = `dc18f904-0b4a-4672-8d83-6d1615b60dc7`
   - `VITE_GRAPH_TENANT_ID` = `57021020-6c74-44f5-aadf-f4ad80a2e9fd`

## Passo 4. Configurar URI de redirecionamento no Entra ID

Após o primeiro deploy, o app vai estar disponível em uma URL tipo `https://NOME-RANDOM.azurestaticapps.net`.

1. Copie essa URL da página de visão geral do Static Web App.
2. Acesse https://entra.microsoft.com.
3. Vá em **Aplicações** > **Registros de aplicações** > localize a app `dc18f904-0b4a-4672-8d83-6d1615b60dc7`.
4. Em **Autenticação** > **Plataformas** > **SPA**, adicione a URL do Azure Static Web Apps como redirect URI.
5. Salve.

## Passo 5. Trigger do deploy

Qualquer push na branch `main` dispara o workflow automaticamente. Para acompanhar:

1. No GitHub, vá em **Actions**: `https://github.com/rodprado128/drivetoolsms/actions`.
2. Veja o run em andamento, aguarde o build e deploy completarem.
3. Após sucesso, acesse a URL do Static Web App.

## Domínio personalizado (opcional)

1. No Static Web App, vá em **Domínios personalizados**.
2. Clique em **Adicionar** e siga o assistente para adicionar registro CNAME ou TXT no seu DNS.

## Troubleshooting

- **Build falha por falta de secrets**: verifique se `VITE_GRAPH_CLIENT_ID` e `VITE_GRAPH_TENANT_ID` estão configurados no GitHub.
- **404 em rotas internas**: confirme que `staticwebapp.config.json` está na raiz com `navigationFallback` apontando para `/index.html`.
- **Erro de auth MSAL no app deployado**: confirme que a URL do Static Web App está registrada como redirect URI SPA no Entra ID.
- **Workflow não dispara**: confirme que o push foi na branch `main` e que o arquivo `.github/workflows/azure-static-web-apps.yml` está no repo.
