# Log Viewer — Banco Hyundai

Visualizador de conversas do Agente Conversacional AWS Bedrock.

---

## Pré-requisitos

- [Python 3.8+](https://www.python.org/downloads/)
- [AWS CLI](https://aws.amazon.com/pt/cli/) instalado e configurado com o profile correto

---

## Instalação e execução

### Windows

```bash
git clone https://github.com/viniciusmendespn/logviewer.git
cd logviewer
start.bat
```

### Mac / Linux

```bash
git clone https://github.com/viniciusmendespn/logviewer.git
cd logviewer
chmod +x start.sh && ./start.sh
```

O script cria o ambiente virtual, instala as dependências e abre automaticamente `http://localhost:5000` no browser.

---

## Atualizar para a versão mais recente

A versão atual é exibida no canto superior esquerdo da ferramenta (ex: `v1.1.0 (3e2a19c)`).

Para atualizar, pare o servidor (`Ctrl+C`) e execute:

### Windows

```bash
update.bat
start.bat
```

### Mac / Linux

```bash
./update.sh
./start.sh
```

---

## Como usar

### 1. Baixar os logs do S3

Na primeira execução a pasta `logs/` estará vazia. Clique em **Sync S3** na barra lateral, informe a data e o profile AWS e clique em **Sincronizar**.

### 2. Navegar pelas sessões

As sessões ficam agrupadas por data na barra lateral. Clique em uma data para expandir e depois em uma sessão para carregar as conversas.

### 3. Buscar por palavras

Use a barra de busca no topo (ou `Ctrl+K`) para buscar por qualquer palavra em perguntas e respostas de **todas as sessões**. Clique em um resultado para abrir a sessão e ir direto à mensagem.

### 4. Detalhes de uma mensagem

Clique em **Detalhes** ou **JSON** em qualquer mensagem para ver os metadados completos (Session ID, Agent ID, tokens, timestamps, flags) ou o JSON bruto.

### Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `Ctrl+K` | Foca a barra de busca |
| `Ctrl+B` | Mostra/oculta a sidebar |
| `Esc` | Fecha painel de detalhes / limpa busca |
