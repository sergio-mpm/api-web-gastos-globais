# Usa a imagem oficial do Nginx
FROM nginx:alpine

# Define o diretório de trabalho dentro do container
WORKDIR /usr/share/nginx/html

# Remove os arquivos padrão do Nginx
RUN rm -rf ./*

# Copia os arquivos do frontend para dentro do container
COPY index.html .
COPY env.docker.js ./env.js
COPY style.css .
COPY scripts.js .

# (Opcional) Se tiver imagens ou outros assets
COPY img ./img

# Exposição da porta padrão do Nginx
EXPOSE 80

# O Nginx já vem configurado para servir /usr/share/nginx/html
