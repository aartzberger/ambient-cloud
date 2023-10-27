# Steps for deploying to EC2

This assums you already have a domain with proper forwarded DNS settings forwarded to elastic ipv4 and ipv6 addresses.s

1. Set up EC2 instance with http, https, ssh ports exposed.

2. Connect to EC2 and install some dependencies:

    ```
    sudo apt update
    sudo snap install docker
    sudo apt-get install nginx
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot
    ```

3. Open nginx site config (/etc/nginx/sites-available/default) and change to the following. if your gitting file size issue theck the client max body:

    ```
    server {
        listen 80;
        server_name www.ambientware.co; # Replace with your domain name(s)

        client_max_body_size 500M; # allows file uploads up to 500 megabytes

        location / {
            proxy_pass http://127.0.0.1:3000; # Forward requests to port 3000 on localhost
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

    }
    ```

4. User certbot to configure ssl cert/keys and automatically update nginx file

    ```
    sudo certbot --nginx
    ```

5. Start Nginx and check that it is working

    ```
    sudo sytemctl start nginx
    sudo systemctl status nginx
    ```

6. add the docker-compose.prod.yml file to EC2 ~ directory and name "docker-compose.yml"

7. run the following to start and monitor logs
    ```
    sudo docker-compose up -d
    sudo docker logs {container name}
    ```
