# Base image olarak Nginx kullanıyoruz (Hafif ve hizli alpine versiyon)
FROM nginx:alpine

# Nginx'in default yayin klasorune projemizdeki dosyalari kopyaliyoruz
COPY . /usr/share/nginx/html

# Gerekli olmayan dosyalari konteyner icinden siliyoruz (opsiyonel ama temiz olur)
RUN rm -rf /usr/share/nginx/html/node_modules \
    /usr/share/nginx/html/package.json \
    /usr/share/nginx/html/package-lock.json \
    /usr/share/nginx/html/docker-compose.yml \
    /usr/share/nginx/html/Dockerfile \
    /usr/share/nginx/html/.git \
    /usr/share/nginx/html/.firebase \
    /usr/share/nginx/html/.firebaserc \
    /usr/share/nginx/html/firebase.json

# 80 portunu disariya aciyoruz
EXPOSE 80

# Nginx'i on planda calistiriyoruz
CMD ["nginx", "-g", "daemon off;"]
