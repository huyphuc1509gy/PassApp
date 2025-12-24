import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Row, Col, Card, CardBody, CardTitle, Form, FormGroup, Label, Input, Button, Alert, Spinner
} from 'reactstrap';
import api from '../api';
import { deriveKeys } from '../utils/crypto.js';
import { AuthContext } from '../contexts/AuthContext'; 
const Login = () => {
    const navigate = useNavigate();

    const { loginSuccess } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Get authkey , enckey 
    // send authkey and email to backend
    // Use enckey for encode vault , save on useContext 
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { authKey, encKey } = deriveKeys(email, password);

            const res = await api.post('/auth/login', {
                email,
                authKey
            });

            const { token, userId } = res.data;
            loginSuccess({ email, userId }, token, encKey);
            navigate('/');

        } catch (err) {
            console.error("Login failed:", err);
            setError(err.response?.data?.message || "Incorrect email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={10} md={8} lg={6} xl={5}>
                    <Card className="shadow-sm border-0 w-100" style={{ minWidth: "420px" }}>
                        <CardBody className="p-4">
                            <div className="text-center mb-4">
                                <h2 className="text-primary fw-bold">My Vault</h2>
                                <p className="text-muted">Login to unlock your vault</p>
                            </div>

                            {error && <Alert color="danger" fade={false}>{error}</Alert>}

                            <Form onSubmit={handleLogin}>
                                <FormGroup>
                                    <Label for="email">Email</Label>
                                    <Input
                                        type="email"
                                        id="email"
                                        required
                                        placeholder="user@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label for="password">Master Password</Label>
                                    <Input
                                        type="password"
                                        id="password"
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </FormGroup>

                                <Button color="primary" block size="lg" disabled={loading} className="mb-3 mt-3">
                                    {loading ? (
                                        <>
                                            <Spinner size="sm" className="me-2" />
                                            Decrypting...
                                        </>
                                    ) : (
                                        'Unlock'
                                    )}
                                </Button>
                            </Form>

                            <div className="d-flex justify-content-between font-small mt-3">
                                <Link to="/recovery" className="text-decoration-none text-muted">
                                    Forgot Password?
                                </Link>
                                <Link to="/register" className="text-decoration-none fw-bold text-primary">
                                    Create New Account
                                </Link>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Login;